import React from 'react'
import './Button.css'

const Button = ({ 
  children, 
  variant = 'primary', 
  onClick, 
  type = 'button',
  disabled = false,
  className = ''
}) => {
  const variants = {
    edit: 'btn-edit',
    save: 'btn-save',
    cancel: 'btn-cancel',
    danger: 'btn-danger',
    primary: 'btn-primary'
  }

  return (
    <button
      type={type}
      className={`${variants[variant] || variants.primary} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export default Button